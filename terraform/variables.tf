# Terraform Variables for CreditAI Infrastructure

# General Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "creditai"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "gcp_project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "gcp_region" {
  description = "Google Cloud region"
  type        = string
  default     = "us-east1"
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "Instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "node_desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

variable "node_max_capacity" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}

variable "node_min_capacity" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_storage_size" {
  description = "Database storage size in GB"
  type        = number
  default     = 100
}

variable "db_backup_retention" {
  description = "Database backup retention period in days"
  type        = number
  default     = 30
}

variable "db_backup_window" {
  description = "Database backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Database maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# Redis Configuration
variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 2
}

# SSL Configuration
variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate in ACM"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "creditai.com"
}

# Monitoring Configuration
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
}

variable "slack_webhook" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Scaling Configuration
variable "min_replicas" {
  description = "Minimum number of application replicas"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum number of application replicas"
  type        = number
  default     = 20
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization for autoscaling"
  type        = number
  default     = 70
}

# Feature Flags
variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "enable_backup_encryption" {
  description = "Enable backup encryption"
  type        = bool
  default     = true
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "instance_tenancy" {
  description = "VPC instance tenancy"
  type        = string
  default     = "default"
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

# Application Configuration
variable "app_image_tag" {
  description = "Docker image tag for the application"
  type        = string
  default     = "latest"
}

variable "app_replicas" {
  description = "Number of application replicas"
  type        = number
  default     = 3
}

# Storage Configuration
variable "storage_class" {
  description = "Storage class for EBS volumes"
  type        = string
  default     = "gp3"
}

variable "storage_size" {
  description = "Size of EBS volumes in GB"
  type        = number
  default     = 50
}

# Logging Configuration
variable "log_retention_days" {
  description = "CloudWatch logs retention period"
  type        = number
  default     = 30
}