# Bookworm is Debian 12.
FROM docker.io/library/rust:1-bookworm AS builder
WORKDIR /build

# Install dependencies and compile.
COPY ./Cargo.toml ./Cargo.lock ./
COPY ./src ./src
RUN cargo build --locked --profile release

FROM docker.io/library/debian:bookworm-slim
WORKDIR /

# Create a non-root user.
RUN : \
    && groupadd nonroot --system \
    && useradd nonroot \
        --create-home \
        --gid nonroot \
        --system
USER nonroot

COPY --chown=nonroot:nonroot --from=builder  \
    /build/target/release/iskprinter-api /bin/data-downloader

CMD [ "/bin/iskprinter-api" ]
