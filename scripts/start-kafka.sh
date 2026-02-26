#!/bin/bash
# ── Local Kafka Quick Start (No Docker Required) ──
# Downloads and runs a single-node Kafka cluster using KRaft mode (no Zookeeper needed)

set -e

KAFKA_VERSION="3.7.0"
SCALA_VERSION="2.13"
KAFKA_DIR="kafka_${SCALA_VERSION}-${KAFKA_VERSION}"
KAFKA_TGZ="${KAFKA_DIR}.tgz"
DOWNLOAD_URL="https://downloads.apache.org/kafka/${KAFKA_VERSION}/${KAFKA_TGZ}"

cd "$(dirname "$0")"

# Download if not exists
if [ ! -d "$KAFKA_DIR" ]; then
  echo "📥 Downloading Kafka ${KAFKA_VERSION}..."
  curl -L -o "$KAFKA_TGZ" "$DOWNLOAD_URL"
  tar -xzf "$KAFKA_TGZ"
  rm "$KAFKA_TGZ"
  echo "✅ Kafka extracted to ${KAFKA_DIR}"
fi

KAFKA_HOME="$(pwd)/${KAFKA_DIR}"
export KAFKA_HOME

# Generate a random cluster ID
CLUSTER_ID=$("${KAFKA_HOME}/bin/kafka-storage.sh" random-uuid)
echo "🔑 Cluster ID: ${CLUSTER_ID}"

# Format the log directory
"${KAFKA_HOME}/bin/kafka-storage.sh" format -t "$CLUSTER_ID" -c "${KAFKA_HOME}/config/kraft/server.properties"

echo ""
echo "🚀 Starting Kafka on localhost:9092 ..."
echo "   Press Ctrl+C to stop"
echo ""

# Start Kafka in KRaft mode
"${KAFKA_HOME}/bin/kafka-server-start.sh" "${KAFKA_HOME}/config/kraft/server.properties"
