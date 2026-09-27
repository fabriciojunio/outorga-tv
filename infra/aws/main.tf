# Versão da internet do modo "Em casa" na AWS, como alternativa à Vercel.
#
# Lightsail Container Service e não ECS com balanceador: roda a mesma imagem
# Docker, já entrega https com certificado, e custa uma fração (o plano nano
# fica perto de 7 dólares por mês, contra uns 16 só do balanceador do ECS).
# Para uma família, é o tamanho certo.
#
# A imagem é a publicada pelo workflow de release no GitHub Container
# Registry (pública), então não é preciso ECR.
#
#   cd infra/aws
#   terraform init
#   terraform apply -var-file=segredos.tfvars   # arquivo fora do Git
#
# Não há biblioteca de vídeos aqui: vídeo do PC só existe em casa. Na
# nuvem ficam catálogo, canais ao vivo e esportes.

terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.regiao

  default_tags {
    tags = {
      Projeto    = "outorga-tv"
      Parte      = "casa"
      Gerenciado = "terraform"
    }
  }
}

resource "aws_lightsail_container_service" "casa" {
  name        = "outorga-casa"
  power       = var.tamanho
  scale       = 1
  is_disabled = false
}

resource "aws_lightsail_container_service_deployment_version" "casa" {
  service_name = aws_lightsail_container_service.casa.name

  container {
    container_name = "servidor"
    image          = "ghcr.io/fabriciojunio/outorga-casa:${var.versao}"

    ports = {
      "3000" = "HTTP"
    }

    # Segredos entram como variável marcada sensível: não aparecem no plano
    # nem na saída do Terraform. O estado guarda o valor, então o estado
    # também precisa ficar fora do Git (o .gitignore da pasta cuida disso).
    environment = {
      TMDB_TOKEN    = var.tmdb_token
      CASA_SEGREDO  = var.casa_segredo
      CASA_USUARIOS = var.casa_usuarios
      CASA_BANCO    = "/tmp/outorga-casa.db"
      NODE_ENV      = "production"
    }
  }

  public_endpoint {
    container_name = "servidor"
    container_port = 3000

    health_check {
      path                = "/api/casa/vivo"
      success_codes       = "200"
      interval_seconds    = 30
      timeout_seconds     = 5
      healthy_threshold   = 2
      unhealthy_threshold = 3
    }
  }
}
