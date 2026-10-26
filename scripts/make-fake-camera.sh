#!/usr/bin/env bash
# Builds fake-camera clips (Y4M) from the synthetic sample faces, for Chromium's
# --use-file-for-fake-video-capture. No real person appears in any clip.
#
#   friend.y4m  "Sam" (AI-generated face) moving gently, for enrolling and recognising
#   street.y4m  Sam, then a face that was never added, then Sam again
#
# Portrait 432x768 (9:16) at 15 fps, like a phone held upright.
# Needs ffmpeg. Output goes to demo/fake-camera/ (not committed; rebuild any time).
set -euo pipefail
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { echo "ffmpeg is required (sudo apt install ffmpeg / brew install ffmpeg)"; exit 1; }

FACES=public/demo/faces
OUT=demo/fake-camera
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
FPS=15

# 1. A still "scene": the face, feathered into a soft, blurred copy of its own
#    background, so it reads like a person in front of the lens, not a photo card.
scene() { # <image> <out.png>
  # The face sits at about arm's length, in the upper part of the frame.
  ffmpeg -loglevel error -y -i "$1" -filter_complex "
    [0]scale=210:210,split[a][b];
    [a]pad=540:900:165:240,fillborders=left=165:right=165:top=240:bottom=450:mode=smear,gblur=sigma=55:steps=3,eq=brightness=-0.02:saturation=0.85[bg];
    [b]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*clip(3.2-3.2*hypot((X-W/2)/(W/2),(Y-H/2)/(H/2)),0,1)'[fg];
    [bg][fg]overlay=165:240" -frames:v 1 "$2"
}

# 2. A "handheld" shot: drift and breathe over the scene (9:16 portrait, like a phone camera).
shot() { # <scene.png> <seconds> <out.y4m> <phase>
  local png=$1 secs=$2 out=$3 ph=$4
  ffmpeg -loglevel error -y -loop 1 -framerate $FPS -t "$secs" -i "$png" -vf "
    crop=432:768:x='54+30*sin(2*PI*t/6+${ph})':y='66+20*sin(2*PI*t/4.5+${ph})',
    noise=alls=3:allf=t,format=yuv420p" -r $FPS -pix_fmt yuv420p -f yuv4mpegpipe "$out"
}

scene "$FACES/sam.jpg" "$TMP/sam.png"
scene "$FACES/stranger.jpg" "$TMP/stranger.png"

echo "Building $OUT/friend.y4m"
shot "$TMP/sam.png" 10 "$OUT/friend.y4m" 0

echo "Building $OUT/street.y4m"
shot "$TMP/sam.png" 6 "$TMP/a.y4m" 0
shot "$TMP/stranger.png" 6 "$TMP/b.y4m" 1
shot "$TMP/sam.png" 5 "$TMP/c.y4m" 2
ffmpeg -loglevel error -y -i "$TMP/a.y4m" -i "$TMP/b.y4m" -i "$TMP/c.y4m" -filter_complex "
  [0][1]xfade=transition=fadeblack:duration=0.6:offset=5.4[ab];
  [ab][2]xfade=transition=fadeblack:duration=0.6:offset=11.0,format=yuv420p" -pix_fmt yuv420p -f yuv4mpegpipe "$OUT/street.y4m"

ls -lh "$OUT"/*.y4m
