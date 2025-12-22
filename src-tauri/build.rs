fn main() {
  // Load .env file at build time
  dotenvy::dotenv().ok();
  
  // Pass environment variables to the compiled binary
  println!("cargo:rustc-env=SUPABASE_URL={}", std::env::var("SUPABASE_URL").unwrap_or_default());
  println!("cargo:rustc-env=SUPABASE_KEY={}", std::env::var("SUPABASE_KEY").unwrap_or_default());
  
  tauri_build::build()
}
