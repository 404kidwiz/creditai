#!/usr/bin/env node

// Monitoring System Setup Script
// Sets up comprehensive monitoring infrastructure

const fs = require('fs').promises;
const path = require('path');

const monitoringConfig = {
  // OpenTelemetry Configuration
  opentelemetry: {
    enabled: true,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    serviceName: 'creditai-app',
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Prometheus Configuration
  prometheus: {
    enabled: true,
    port: 9090,
    metricsPath: '/metrics',
    scrapeInterval: '15s',
  },
  
  // Grafana Configuration
  grafana: {
    enabled: true,
    port: 3001,
    defaultDashboard: 'creditai-overview',
  },
  
  // AlertManager Configuration
  alertmanager: {
    enabled: true,
    port: 9093,
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    emailConfig: {
      smtp: process.env.SMTP_SERVER,
      username: process.env.SMTP_USERNAME,
      password: process.env.SMTP_PASSWORD,
    },
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: true,
    enableStructuredLogging: true,
    enableAuditLogging: true,
  },
  
  // Health Check Configuration
  healthChecks: {
    enabled: true,
    interval: 60, // seconds
    timeout: 5000, // milliseconds
    criticalChecks: ['database', 'ai_models', 'environment'],
  },
};

const dockerComposeMonitoring = `
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: creditai-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: creditai-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:-admin123}
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: creditai-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    restart: unless-stopped
    networks:
      - monitoring

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: creditai-jaeger
    ports:
      - "14268:14268"
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    restart: unless-stopped
    networks:
      - monitoring

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: creditai-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped
    networks:
      - monitoring

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: creditai-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    restart: unless-stopped
    networks:
      - monitoring

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: creditai-logstash
    ports:
      - "5044:5044"
      - "9600:9600"
    volumes:
      - ./monitoring/logstash/config:/usr/share/logstash/config
      - ./monitoring/logstash/pipeline:/usr/share/logstash/pipeline
    environment:
      - "LS_JAVA_OPTS=-Xmx512m -Xms512m"
    depends_on:
      - elasticsearch
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  elasticsearch_data:

networks:
  monitoring:
    driver: bridge
`;

const prometheusConfig = `
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'creditai-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/api/monitoring/metrics'
    scrape_interval: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 5s
`;

const alertRules = `
groups:
  - name: creditai-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: error
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighMemoryUsage
        expr: (system_memory_usage_bytes{type="heap_used"} / system_memory_usage_bytes{type="heap_total"}) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: DatabaseConnectionFailure
        expr: up{job="creditai-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"
          description: "Unable to connect to database"

      - alert: AIModelFailure
        expr: rate(ai_model_requests_total{success="false"}[5m]) / rate(ai_model_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: error
        annotations:
          summary: "AI model failure rate high"
          description: "AI model failure rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job="creditai-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "CreditAI application is not responding"
`;

const alertManagerConfig = `
global:
  smtp_smarthost: '\${SMTP_SERVER}'
  smtp_from: '\${SMTP_FROM}'
  smtp_auth_username: '\${SMTP_USERNAME}'
  smtp_auth_password: '\${SMTP_PASSWORD}'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: error
      receiver: 'error-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: '\${ALERT_WEBHOOK_URL}'
        send_resolved: true

  - name: 'critical-alerts'
    email_configs:
      - to: '\${ALERT_EMAIL}'
        subject: '[CRITICAL] CreditAI Alert - {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Status: {{ .Status }}
          {{ end }}
    slack_configs:
      - api_url: '\${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'Critical Alert - {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'error-alerts'
    email_configs:
      - to: '\${ALERT_EMAIL}'
        subject: '[ERROR] CreditAI Alert - {{ .GroupLabels.alertname }}'

  - name: 'warning-alerts'
    slack_configs:
      - api_url: '\${SLACK_WEBHOOK_URL}'
        channel: '#monitoring'
        title: 'Warning - {{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
`;

const grafanaDataSource = `
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: logstash-*
    interval: Daily
    timeField: "@timestamp"
    editable: true
`;

const logstashConfig = `
input {
  beats {
    port => 5044
  }
  http {
    port => 8080
    codec => json
  }
}

filter {
  if [fields][service] == "creditai" {
    json {
      source => "message"
    }
    
    date {
      match => [ "timestamp", "yyyy-MM-dd HH:mm:ss.SSS" ]
    }
    
    mutate {
      add_field => { "service" => "creditai" }
      add_field => { "environment" => "\${NODE_ENV:development}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "creditai-logs-%{+YYYY.MM.dd}"
  }
  
  stdout {
    codec => rubydebug
  }
}
`;

async function createDirectories() {
  const dirs = [
    'monitoring',
    'monitoring/prometheus',
    'monitoring/grafana',
    'monitoring/grafana/provisioning',
    'monitoring/grafana/provisioning/datasources',
    'monitoring/grafana/provisioning/dashboards',
    'monitoring/grafana/dashboards',
    'monitoring/alertmanager',
    'monitoring/logstash',
    'monitoring/logstash/config',
    'monitoring/logstash/pipeline',
    'logs',
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${dir}:`, error.message);
    }
  }
}

async function writeConfigFiles() {
  const files = [
    {
      path: 'docker-compose.monitoring.yml',
      content: dockerComposeMonitoring,
      description: 'Docker Compose configuration for monitoring stack',
    },
    {
      path: 'monitoring/prometheus/prometheus.yml',
      content: prometheusConfig,
      description: 'Prometheus configuration',
    },
    {
      path: 'monitoring/prometheus/alert_rules.yml',
      content: alertRules,
      description: 'Prometheus alert rules',
    },
    {
      path: 'monitoring/alertmanager/alertmanager.yml',
      content: alertManagerConfig,
      description: 'AlertManager configuration',
    },
    {
      path: 'monitoring/grafana/provisioning/datasources/datasources.yml',
      content: grafanaDataSource,
      description: 'Grafana datasource configuration',
    },
    {
      path: 'monitoring/logstash/pipeline/logstash.conf',
      content: logstashConfig,
      description: 'Logstash pipeline configuration',
    },
  ];

  for (const file of files) {
    try {
      await fs.writeFile(file.path, file.content);
      console.log(`✅ Created: ${file.path} - ${file.description}`);
    } catch (error) {
      console.error(`❌ Failed to create ${file.path}:`, error.message);
    }
  }
}

async function copyGrafanaDashboard() {
  try {
    const dashboardPath = 'src/lib/monitoring/grafana/dashboards.json';
    const targetPath = 'monitoring/grafana/dashboards/creditai-overview.json';
    
    const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
    await fs.writeFile(targetPath, dashboardContent);
    console.log('✅ Copied Grafana dashboard configuration');
  } catch (error) {
    console.error('❌ Failed to copy Grafana dashboard:', error.message);
  }
}

async function updateEnvFile() {
  try {
    const envPath = '.env.local';
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, create new
    }

    const monitoringEnvVars = `
# Monitoring Configuration
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=creditai-app
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
ALERTS_ENABLED=true
ALERT_EVALUATION_INTERVAL=30
HEALTH_CHECKS_ENABLED=true
HEALTH_CHECK_INTERVAL=60
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true

# Alert Configuration (optional)
ALERT_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
ALERT_EMAIL=
SMTP_SERVER=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
GRAFANA_PASSWORD=admin123
`;

    if (!envContent.includes('# Monitoring Configuration')) {
      envContent += monitoringEnvVars;
      await fs.writeFile(envPath, envContent);
      console.log('✅ Updated .env.local with monitoring configuration');
    } else {
      console.log('ℹ️  Monitoring configuration already exists in .env.local');
    }
  } catch (error) {
    console.error('❌ Failed to update .env.local:', error.message);
  }
}

async function createStartupScript() {
  const startupScript = `#!/bin/bash

# CreditAI Monitoring Stack Startup Script

echo "🚀 Starting CreditAI Monitoring Stack..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start monitoring stack
echo "📊 Starting monitoring services..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
services=("prometheus:9090" "grafana:3001" "alertmanager:9093" "jaeger:16686" "elasticsearch:9200" "kibana:5601")

for service in "\${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -f -s "http://localhost:$port" > /dev/null; then
        echo "✅ $name is running on port $port"
    else
        echo "⚠️  $name may not be ready yet on port $port"
    fi
done

echo ""
echo "🎉 Monitoring stack is starting up!"
echo ""
echo "📊 Access URLs:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3001 (admin/admin123)"
echo "   AlertManager: http://localhost:9093"
echo "   Jaeger: http://localhost:16686"
echo "   Elasticsearch: http://localhost:9200"
echo "   Kibana: http://localhost:5601"
echo ""
echo "🔍 Application Monitoring:"
echo "   Health Check: http://localhost:3000/api/system/health"
echo "   Metrics: http://localhost:3000/api/monitoring/metrics"
echo "   Dashboard: http://localhost:3000/api/monitoring/dashboard"
echo ""
echo "📖 View logs: docker-compose -f docker-compose.monitoring.yml logs -f"
echo "🛑 Stop stack: docker-compose -f docker-compose.monitoring.yml down"
`;

  try {
    await fs.writeFile('start-monitoring.sh', startupScript);
    console.log('✅ Created startup script: start-monitoring.sh');
    
    // Make script executable on Unix systems
    if (process.platform !== 'win32') {
      const { exec } = require('child_process');
      exec('chmod +x start-monitoring.sh');
    }
  } catch (error) {
    console.error('❌ Failed to create startup script:', error.message);
  }
}

async function main() {
  console.log('🔧 Setting up CreditAI Monitoring Infrastructure...\n');

  await createDirectories();
  console.log('');
  
  await writeConfigFiles();
  console.log('');
  
  await copyGrafanaDashboard();
  console.log('');
  
  await updateEnvFile();
  console.log('');
  
  await createStartupScript();
  console.log('');

  console.log('✅ Monitoring setup complete!\n');
  console.log('📋 Next steps:');
  console.log('1. Review and update monitoring configuration in .env.local');
  console.log('2. Run: ./start-monitoring.sh (or bash start-monitoring.sh on Windows)');
  console.log('3. Start your application: npm run dev');
  console.log('4. Access Grafana at http://localhost:3001 (admin/admin123)');
  console.log('5. Import additional dashboards as needed');
  console.log('');
  console.log('📖 Documentation: Check the monitoring directory for configuration files');
}

main().catch(console.error);