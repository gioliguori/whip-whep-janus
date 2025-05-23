FROM debian:12-slim
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git build-essential autoconf automake libtool pkg-config \
    libsoup-3.0-dev libglib2.0-dev \
    libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-bad1.0-dev \
    gstreamer1.0-nice \
    gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 https://github.com/meetecho/simple-whep-client.git && \
    cd simple-whep-client && make && cp whep-client /usr/local/bin && \
    cd .. && rm -rf simple-whep-client

ENV URL=http://node-server:7070/whep/endpoint/abc123 \
    TOKEN= \
    AUDIO_CAPS="application/x-rtp,media=audio,encoding-name=OPUS,payload=111" \
    VIDEO_CAPS="application/x-rtp,media=video,encoding-name=VP8,payload=96" \
    STUN_SERVER=stun://stun.l.google.com:19302 \
    GST_DEBUG=2

ENTRYPOINT ["/bin/sh","-c","exec whep-client -u \"$URL\" ${TOKEN:+-t $TOKEN} -A \"$AUDIO_CAPS\" -V \"$VIDEO_CAPS\" -S \"$STUN_SERVER\""]
