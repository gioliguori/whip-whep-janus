FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libmicrohttpd-dev \
    libjansson-dev \
    libssl-dev \
    libsofia-sip-ua-dev \
    libglib2.0-dev \
    libopus-dev \
    libogg-dev \
    libcurl4-openssl-dev \
    liblua5.3-dev \
    libconfig-dev \
    pkg-config \
    libtool \
    automake \
    autoconf \
    wget \
    python3 \
    python3-pip \
    ninja-build \
    meson \
    && rm -rf /var/lib/apt/lists/*

# libnice
RUN git clone https://gitlab.freedesktop.org/libnice/libnice.git \
    && cd libnice \
    && meson --prefix=/usr build \
    && ninja -C build \
    && ninja -C build install \
    && cd .. \
    && rm -rf libnice

# libsrtp 2.x
RUN wget https://github.com/cisco/libsrtp/archive/v2.4.2.tar.gz \
    && tar xfv v2.4.2.tar.gz \
    && cd libsrtp-2.4.2 \
    && ./configure --prefix=/usr --enable-openssl \
    && make shared_library \
    && make install \
    && cd .. \
    && rm -rf libsrtp-2.4.2 v2.4.2.tar.gz

# libwebsockets
RUN git clone https://github.com/warmcat/libwebsockets.git \
    && cd libwebsockets \
    && git checkout v4.3-stable \
    && mkdir build \
    && cd build \
    && cmake -DLWS_MAX_SMP=1 \
           -DLWS_WITHOUT_EXTENSIONS=0 \
           -DCMAKE_INSTALL_PREFIX:PATH=/usr \
           -DCMAKE_C_FLAGS="-fpic" .. \
    && make \
    && make install \
    && cd ../.. \
    && rm -rf libwebsockets

# usrsctp
RUN git clone https://github.com/sctplab/usrsctp.git \
    && cd usrsctp \
    && ./bootstrap \
    && ./configure --prefix=/usr --disable-programs --disable-inet --disable-inet6 \
    && make \
    && make install \
    && cd .. \
    && rm -rf usrsctp

# janus
RUN git clone https://github.com/meetecho/janus-gateway.git \
    && cd janus-gateway \
    && sh autogen.sh \
    && ./configure \
        --prefix=/opt/janus \
        --enable-websockets \
        --enable-data-channels \
        --enable-plugin-rtpforward \ 
        --disable-plugin-videocall \
        --disable-plugin-sip \
        --disable-plugin-audiobridge \
        --disable-plugin-recordplay \
        --disable-plugin-textroom \
        --disable-plugin-echotest \
        --disable-plugin-nosip \
    && make \
    && make install \
    && make configs \
    && cd .. \
    && rm -rf janus-gateway


# janus log
RUN mkdir -p /var/log/janus

EXPOSE 8088 8188 20000-20100/udp

CMD ["/opt/janus/bin/janus", "-F", "/opt/janus/etc/janus"]