# ChatGov Deployment Guide

This guide covers deploying ChatGov to production using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Congress API key from https://api.congress.gov/sign-up/
- Port 3000 (or 80) available on your server

## Quick Deploy with Docker Compose

### 1. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export CONGRESS_API_KEY=your_congress_api_key_here
```

### 2. Deploy with Docker Compose

For development/testing (port 3000):
```bash
docker-compose up -d
```

For production (port 80):
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Manual Docker Build and Run

### 1. Build the Docker Image

```bash
docker build -t chatgov .
```

### 2. Run the Container

```bash
docker run -d \
  --name chatgov \
  -p 3000:3000 \
  -e CONGRESS_API_KEY=your_congress_api_key_here \
  -e NODE_ENV=production \
  --restart unless-stopped \
  chatgov
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CONGRESS_API_KEY` | Your Congress.gov API key | `demo_key` | Recommended |
| `PORT` | Port for the server to listen on | `3000` | No |
| `HOST` | Host interface to bind to | `0.0.0.0` | No |
| `NODE_ENV` | Node environment | `production` | No |

## Health Check

The application includes a health check endpoint at `/api/health` that Docker will use to monitor container health.

## Logs

View container logs:
```bash
docker logs chatgov
```

Follow logs in real-time:
```bash
docker logs -f chatgov
```

## Stopping the Application

With Docker Compose:
```bash
docker-compose down
```

With Docker run:
```bash
docker stop chatgov
docker rm chatgov
```

## Updating the Application

1. Pull the latest code
2. Rebuild the image:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Troubleshooting

### Container won't start
- Check logs: `docker logs chatgov`
- Verify environment variables are set correctly
- Ensure port 3000 is available

### API requests failing
- Verify `CONGRESS_API_KEY` is set correctly
- Check network connectivity from container
- Review application logs for detailed error messages

### Health check failing
- Container may still be starting (wait 40 seconds)
- Check if application is listening on correct port
- Verify `/api/health` endpoint is accessible

## Production Considerations

1. **Reverse Proxy**: Consider using nginx or similar for SSL termination
2. **Monitoring**: Set up monitoring for the container and application
3. **Backups**: No persistent data, but consider backing up configuration
4. **Security**: Keep the Congress API key secure and rotate regularly
5. **Updates**: Establish a process for updating the application

## Cloud Deployment

This Docker setup works with most cloud providers:

- **AWS**: ECS, EKS, or EC2 with Docker
- **Google Cloud**: Cloud Run, GKE, or Compute Engine
- **Azure**: Container Instances, AKS, or Virtual Machines
- **DigitalOcean**: App Platform or Droplets
- **Heroku**: Container Registry

Example for cloud deployment with environment variables managed by the platform.