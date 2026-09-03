# Containerized Testing Guide

## Overview

This project uses Docker containers for running tests to ensure consistency between local development and CI environments.

## Quick Start

### Building the Test Container

```bash
npm run test:docker:build
```

### Running Tests

```bash
# Run all tests with coverage
npm run test:docker

# Run quality checks (lint + type-check)
npm run quality:docker
```

## Environment Configuration

The test container automatically sets:

```bash
NODE_ENV=test
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
CI=true
```

## CI Integration

The GitHub Actions workflow uses the same Docker configuration for consistency.

## Benefits

- ✅ **Consistency**: Same environment locally and in CI
- ✅ **Isolation**: Tests run in clean container each time
- ✅ **Reproducibility**: No "works on my machine" issues
- ✅ **Caching**: Docker layer caching speeds up repeated runs

## Advanced Usage

### Running Specific Tests

```bash
docker-compose -f docker-compose.test.yml run --rm aframp-test npm test -- path/to/test.spec.ts
```

### Debugging in Container

```bash
docker-compose -f docker-compose.test.yml run --rm aframp-test sh
```

### Cleaning Up

```bash
docker-compose -f docker-compose.test.yml down -v
```

## Troubleshooting

### Container builds slowly
**Solution**: Use BuildKit and caching
```bash
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.test.yml build
```

### Tests fail in container but work locally
**Solution**: Check environment variables
```bash
docker-compose -f docker-compose.test.yml run --rm aframp-test env | sort
```

---

**Last Updated**: 2026-08-29  
**Maintainer**: Aframp Engineering Team
