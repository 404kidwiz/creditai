#!/bin/bash

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

for service in "${services[@]}"; do
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
