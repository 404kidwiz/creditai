# Terraform Outputs for CreditAI Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = module.eks.cluster_arn
}

output "eks_cluster_version" {
  description = "The Kubernetes server version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "eks_node_group_arn" {
  description = "Amazon Resource Name (ARN) of the EKS Node Group"
  value       = module.eks.node_group_arn
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
}

output "rds_username" {
  description = "RDS master username"
  value       = module.rds.username
  sensitive   = true
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = module.rds.security_group_id
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = module.redis.security_group_id
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.alb_zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = module.alb.alb_arn
}

output "alb_security_group_id" {
  description = "Security group ID of the load balancer"
  value       = module.alb.security_group_id
}

# S3 Outputs
output "backup_bucket_name" {
  description = "Name of the backup S3 bucket"
  value       = module.s3.backup_bucket_name
}

output "backup_bucket_arn" {
  description = "ARN of the backup S3 bucket"
  value       = module.s3.backup_bucket_arn
}

output "storage_bucket_name" {
  description = "Name of the storage S3 bucket"
  value       = module.s3.storage_bucket_name
}

output "storage_bucket_arn" {
  description = "ARN of the storage S3 bucket"
  value       = module.s3.storage_bucket_arn
}

# Monitoring Outputs
output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = module.monitoring.dashboard_url
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = module.monitoring.sns_topic_arn
}

# DNS Outputs
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.dns.zone_id
}

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

# WAF Outputs
output "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  value       = module.waf.web_acl_id
}

# Google Cloud Outputs
output "gcs_backup_bucket" {
  description = "Google Cloud Storage backup bucket name"
  value       = google_storage_bucket.backup_bucket.name
}

output "gcp_kms_key_id" {
  description = "Google Cloud KMS key ID"
  value       = google_kms_crypto_key.backup_key.id
}

# Security Outputs
output "backup_role_arn" {
  description = "ARN of the backup IAM role"
  value       = aws_iam_role.backup_role.arn
}

# Connection Information (for applications)
output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${module.rds.username}:${module.rds.password}@${module.rds.endpoint}:${module.rds.port}/${module.rds.database_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${module.redis.endpoint}:${module.redis.port}"
  sensitive   = true
}

# Kubernetes Configuration
output "kubeconfig_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# Application URLs
output "application_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

# Infrastructure Summary
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    vpc_id                = module.vpc.vpc_id
    eks_cluster           = module.eks.cluster_name
    rds_endpoint         = module.rds.endpoint
    redis_endpoint       = module.redis.endpoint
    load_balancer        = module.alb.alb_dns_name
    backup_bucket        = module.s3.backup_bucket_name
    storage_bucket       = module.s3.storage_bucket_name
    domain               = var.domain_name
    environment          = var.environment
    region               = var.aws_region
  }
}

# Cost Estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    eks_cluster     = "~$73/month (cluster) + ~$30/month per node"
    rds_database    = "~$25-100/month depending on instance type"
    redis_cache     = "~$15-50/month depending on node type"
    load_balancer   = "~$20/month"
    s3_storage      = "~$0.023/GB/month"
    data_transfer   = "Variable based on usage"
    cloudwatch      = "~$5-20/month"
    route53         = "~$0.50/month per hosted zone"
    total_estimate  = "~$150-300/month for typical production workload"
  }
}

# Security Compliance
output "security_compliance" {
  description = "Security compliance status"
  value = {
    waf_enabled           = var.enable_waf
    ssl_enabled          = true
    backup_encryption    = var.enable_backup_encryption
    vpc_isolation        = true
    private_subnets      = true
    security_groups      = true
    iam_roles           = true
    cloudtrail_logging  = true
  }
}