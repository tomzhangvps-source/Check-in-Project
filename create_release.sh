#!/bin/bash
# GitHub Release 创建脚本

REPO="tomzhangvps-source/Check-in-Project"
VERSION="1.0.0"
TAG="v${VERSION}"
RELEASE_NAME="v${VERSION} - 初始版本（含更新功能）"
RELEASE_NOTES="## 更新内容
- 修复跨日班次早退判断问题
- 添加自动更新功能
- 支持 GitHub Releases 自动更新

## 安装说明
1. 下载并安装 DMG 文件
2. 应用会自动检查更新

## 更新说明
应用会在启动时自动检查更新，发现新版本时会提示您更新。"
UPDATE_FILE="src-tauri/target/release/bundle/macos/员工打卡系统.app.tar.gz"

# 检查 GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 错误: 需要设置 GITHUB_TOKEN 环境变量"
    echo ""
    echo "请先获取 GitHub Personal Access Token:"
    echo "1. 访问: https://github.com/settings/tokens"
    echo "2. 点击 'Generate new token (classic)'"
    echo "3. 勾选 'repo' 权限"
    echo "4. 生成并复制 token"
    echo ""
    echo "然后运行:"
    echo "export GITHUB_TOKEN=你的token"
    echo "bash create_release.sh"
    exit 1
fi

# 检查更新文件是否存在
if [ ! -f "$UPDATE_FILE" ]; then
    echo "❌ 错误: 更新文件不存在: $UPDATE_FILE"
    exit 1
fi

echo "📦 正在创建 GitHub Release..."
echo "仓库: $REPO"
echo "版本: $TAG"
echo ""

# 创建 Release (使用 Python 生成 JSON 避免转义问题)
TEMP_JSON=$(mktemp)
python3 << PYEOF > "$TEMP_JSON"
import json
data = {
    "tag_name": "$TAG",
    "name": "$RELEASE_NAME",
    "body": """$RELEASE_NOTES""",
    "draft": False,
    "prerelease": False
}
print(json.dumps(data, ensure_ascii=False))
PYEOF

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  --data-binary "@$TEMP_JSON" \
  "https://api.github.com/repos/$REPO/releases")

rm -f "$TEMP_JSON"

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
    echo "❌ 创建 Release 失败 (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    exit 1
fi

# 获取上传 URL
UPLOAD_URL=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['upload_url'])" 2>/dev/null | sed 's/{?name,label}//')
RELEASE_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$UPLOAD_URL" ]; then
    echo "❌ 无法获取上传 URL"
    exit 1
fi

echo "✅ Release 创建成功 (ID: $RELEASE_ID)"
echo "📤 正在上传更新包..."

# 上传更新包（对文件名进行 URL 编码）
FILENAME=$(basename "$UPDATE_FILE")
ENCODED_FILENAME=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$FILENAME'))")
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/gzip" \
  --data-binary "@$UPDATE_FILE" \
  "$UPLOAD_URL?name=$ENCODED_FILENAME")

UPLOAD_HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$UPLOAD_HTTP_CODE" = "201" ]; then
    echo "✅ 更新包上传成功"
    echo ""
    echo "🎉 Release 创建完成！"
    echo "访问: https://github.com/$REPO/releases/tag/$TAG"
else
    echo "❌ 上传失败 (HTTP $UPLOAD_HTTP_CODE)"
    echo "$UPLOAD_BODY"
    exit 1
fi
