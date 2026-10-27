#!/bin/zsh
set -eu
cd "$(dirname "$0")"

# Static preview: no Next.js compilation, dependency install, or cache deletion.
# Keep the bundled Node fallback for Macs without a recent Node installation.
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)" -lt 22 ]; then
  NODE_VERSION="24.15.0"
  NODE_DIR=".tools/node"
  if [ ! -x "$NODE_DIR/bin/node" ]; then
    case "$(uname -m)" in
      arm64) NODE_ARCH="arm64" ;;
      x86_64) NODE_ARCH="x64" ;;
      *) echo "Unsupported Mac architecture"; exit 1 ;;
    esac
    mkdir -p .tools
    ARCHIVE="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.xz"
    curl -fL "https://nodejs.org/dist/v${NODE_VERSION}/${ARCHIVE}" -o ".tools/${ARCHIVE}"
    tar -xJf ".tools/${ARCHIVE}" -C .tools
    rm -rf "$NODE_DIR"
    mv ".tools/node-v${NODE_VERSION}-darwin-${NODE_ARCH}" "$NODE_DIR"
  fi
  export PATH="$PWD/$NODE_DIR/bin:$PATH"
fi

PORT="${PORT:-3000}"
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done
LAN_IP="$(ifconfig | awk '/inet / && $2 != "127.0.0.1" && $2 !~ /^169\.254\./ { print $2; exit }')"
LOCAL_URL="http://localhost:$PORT"

echo "黑桃党静态预览：$LOCAL_URL"
if [ -n "$LAN_IP" ]; then
  echo "同一 Wi-Fi 手机预览：http://$LAN_IP:$PORT"
fi
(
  for attempt in {1..30}; do
    if node -e "fetch('$LOCAL_URL').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      open "$LOCAL_URL"
      exit 0
    fi
    sleep 1
  done
  echo "预览尚未就绪，请检查终端错误信息。"
) &
HOST=0.0.0.0 PORT="$PORT" node preview-server.mjs
