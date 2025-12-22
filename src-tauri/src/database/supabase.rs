use reqwest::Client;
use anyhow::{Result, Context, anyhow};

#[derive(Clone)]
pub struct SupabaseClient {
    base_url: String,
    api_key: String,
    client: Client,
}

impl SupabaseClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        Self {
            base_url,
            api_key,
            client: Client::new(),
        }
    }

    /// GET request to Supabase
    pub async fn get<T: serde::de::DeserializeOwned>(
        &self,
        table: &str,
        params: Option<Vec<(&str, &str)>>,
    ) -> Result<Vec<T>> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        let mut request = self.client
            .get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key));
        
        if let Some(params) = params {
            request = request.query(&params);
        }
        
        let response = request.send().await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Supabase error: {}", error_text));
        }
        
        let data = response.json::<Vec<T>>().await?;
        Ok(data)
    }

    /// POST request to Supabase
    pub async fn post<T: serde::Serialize, R: serde::de::DeserializeOwned>(
        &self,
        table: &str,
        data: &T,
    ) -> Result<R> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(data)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Supabase error: {}", error_text));
        }
        
        let mut results = response.json::<Vec<R>>().await?;
        results.pop().context("No data returned from Supabase")
    }

    /// PATCH request to Supabase
    pub async fn patch<T: serde::Serialize>(
        &self,
        table: &str,
        params: Vec<(&str, &str)>,
        data: &T,
    ) -> Result<()> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        let response = self.client
            .patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .query(&params)
            .json(data)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Supabase error: {}", error_text));
        }
        
        Ok(())
    }

    /// DELETE request to Supabase
    pub async fn delete(
        &self,
        table: &str,
        params: Vec<(&str, &str)>,
    ) -> Result<()> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        let response = self.client
            .delete(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .query(&params)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Supabase error: {}", error_text));
        }
        
        Ok(())
    }
}
