#!/bin/zsh
set -e

cd "$(dirname "$0")"

NODE_VERSION="24.15.0"
TOOLS_DIR=".tools"
NODE_DIR="$TOOLS_DIR/node"

echo "Preparing 黑桃党 website preview..."

if [ ! -x "$NODE_DIR/bin/npm" ]; then
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64) NODE_ARCH="arm64" ;;
    x86_64) NODE_ARCH="x64" ;;
    *)
      echo "Unsupported Mac architecture: $ARCH"
      exit 1
      ;;
  esac

  mkdir -p "$TOOLS_DIR"
  NODE_FILE="node-v$NODE_VERSION-darwin-$NODE_ARCH.tar.xz"
  NODE_URL="https://nodejs.org/dist/v$NODE_VERSION/$NODE_FILE"

  echo "Downloading Node.js v$NODE_VERSION LTS from nodejs.org..."
  curl -fL "$NODE_URL" -o "$TOOLS_DIR/$NODE_FILE"

  echo "Installing local Node.js..."
  rm -rf "$NODE_DIR" "$TOOLS_DIR/node-v$NODE_VERSION-darwin-$NODE_ARCH"
  tar -xJf "$TOOLS_DIR/$NODE_FILE" -C "$TOOLS_DIR"
  mv "$TOOLS_DIR/node-v$NODE_VERSION-darwin-$NODE_ARCH" "$NODE_DIR"
fi

export PATH="$PWD/$NODE_DIR/bin:$PATH"

echo "Node: $(node -v)"
echo "npm: $(npm -v)"

if [ ! -d "node_modules" ] || [ ! -x "node_modules/.bin/next" ]; then
  echo "Installing website dependencies..."
  npm install
fi

echo "Cleaning old Next.js cache..."
npm run clean

PORT="${PORT:-3000}"
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  echo "Port $PORT is already in use, trying the next port..."
  PORT=$((PORT + 1))
done

LAN_IP="$(ifconfig | awk '/inet / && $2 != "127.0.0.1" && $2 !~ /^169\\.254\\./ { print $2; exit }')"
LOCAL_URL="http://localhost:$PORT"
PHONE_URL="http://$LAN_IP:$PORT"

echo "Starting 黑桃党 website..."
echo "Computer preview: $LOCAL_URL"
if [ -n "$LAN_IP" ]; then
  echo "Phone preview on the same Wi-Fi: $PHONE_URL"
fi
echo "Please keep this terminal window open while browsing."

(
  for attempt in {1..60}; do
    if node -e "fetch('$LOCAL_URL').then(() => process.exit(0)).catch(() => process.exit(1))" >/dev/null 2>&1; then
      echo "Website is ready. Opening $LOCAL_URL ..."
      if [ -n "$LAN_IP" ]; then
        echo "Share this phone link: $PHONE_URL"
      fi
      open "$LOCAL_URL"
      exit 0
    fi
    sleep 1
  done

  echo "The website is still starting. When you see 'Ready' in this terminal, open $LOCAL_URL manually."
) &

npm run dev -- --hostname 0.0.0.0 --port "$PORT"
