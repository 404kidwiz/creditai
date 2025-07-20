# CreditAI Infrastructure as Code
# Main Terraform configuration for production deployment

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.84"
    }
  }
  
  backend "s3" {
    bucket         = "creditai-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "creditai-terraform-locks"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "CreditAI"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
    }
  }
}

# Configure Google Cloud Provider
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Terraform   = "true"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  name_prefix         = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  
  tags = local.common_tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  name_prefix           = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnet_ids
  node_group_subnets   = module.vpc.private_subnet_ids
  
  cluster_version      = var.kubernetes_version
  node_instance_types  = var.node_instance_types
  node_desired_capacity = var.node_desired_capacity
  node_max_capacity    = var.node_max_capacity
  node_min_capacity    = var.node_min_capacity
  
  tags = local.common_tags
}

# RDS Database Module
module "rds" {
  source = "./modules/rds"
  
  name_prefix     = local.name_prefix
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  
  engine_version = var.postgres_version
  instance_class = var.db_instance_class
  storage_size   = var.db_storage_size
  
  backup_retention_period = var.db_backup_retention
  backup_window          = var.db_backup_window
  maintenance_window     = var.db_maintenance_window
  
  tags = local.common_tags
}

# Redis ElastiCache Module
module "redis" {
  source = "./modules/redis"
  
  name_prefix = local.name_prefix
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  
  node_type       = var.redis_node_type
  num_cache_nodes = var.redis_num_nodes
  
  tags = local.common_tags
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"
  
  name_prefix = local.name_prefix
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids
  
  certificate_arn = var.ssl_certificate_arn
  
  tags = local.common_tags
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  
  backup_bucket_name = "${local.name_prefix}-backups"
  storage_bucket_name = "${local.name_prefix}-storage"
  
  tags = local.common_tags
}

# CloudWatch Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix    = local.name_prefix
  eks_cluster_name = module.eks.cluster_name
  
  alert_email    = var.alert_email
  slack_webhook  = var.slack_webhook
  
  tags = local.common_tags
}

# WAF Module
module "waf" {
  source = "./modules/waf"
  
  name_prefix = local.name_prefix
  alb_arn    = module.alb.alb_arn
  
  tags = local.common_tags
}

# Route53 DNS Module
module "dns" {
  source = "./modules/dns"
  
  domain_name = var.domain_name
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
  
  tags = local.common_tags
}

# Google Cloud Storage for backups
resource "google_storage_bucket" "backup_bucket" {
  name     = "${local.name_prefix}-gcs-backups"
  location = var.gcp_region
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.backup_key.id
  }
}

# KMS key for encryption
resource "google_kms_key_ring" "creditai_keyring" {
  name     = "${local.name_prefix}-keyring"
  location = var.gcp_region
}

resource "google_kms_crypto_key" "backup_key" {
  name     = "${local.name_prefix}-backup-key"
  key_ring = google_kms_key_ring.creditai_keyring.id
  
  rotation_period = "7776000s" # 90 days
}

# IAM roles and policies
resource "aws_iam_role" "backup_role" {
  name = "${local.name_prefix}-backup-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy" "backup_policy" {
  name = "${local.name_prefix}-backup-policy"
  role = aws_iam_role.backup_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.s3.backup_bucket_arn,
          "${module.s3.backup_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBSnapshot",
          "rds:DeleteDBSnapshot",
          "rds:DescribeDBSnapshots"
        ]
        Resource = "*"
      }
    ]
  })
}