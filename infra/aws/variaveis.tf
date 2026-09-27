variable "regiao" {
  # O Lightsail não existe em São Paulo (sa-east-1). A Virgínia é a mais
  # barata das regiões dele e fica a uns 120 ms do Brasil.
  description = "Região da AWS onde o Lightsail existe."
  type        = string
  default     = "us-east-1"

  validation {
    condition     = var.regiao != "sa-east-1"
    error_message = "O Lightsail não está disponível em sa-east-1. Use us-east-1, por exemplo."
  }
}

variable "tamanho" {
  description = "Tamanho do contêiner no Lightsail (nano, micro, small...)."
  type        = string
  default     = "nano"

  validation {
    condition     = contains(["nano", "micro", "small", "medium"], var.tamanho)
    error_message = "Use nano, micro, small ou medium."
  }
}

variable "versao" {
  description = "Versão da imagem publicada no GitHub Container Registry, por exemplo 1.0.0."
  type        = string
  default     = "1.0.0"

  validation {
    condition     = var.versao != "latest"
    error_message = "Use uma versão fixa: latest não dá para reverter."
  }
}

variable "tmdb_token" {
  description = "Token de leitura da API do TMDB."
  type        = string
  sensitive   = true
}

variable "casa_segredo" {
  description = "Segredo que assina o cookie de login (32 caracteres ou mais)."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.casa_segredo) >= 32
    error_message = "O segredo precisa de pelo menos 32 caracteres."
  }
}

variable "casa_usuarios" {
  description = "JSON dos usuários com hash de senha (gerado por npm run casa:usuario -- ... --so-imprimir)."
  type        = string
  sensitive   = true
}
