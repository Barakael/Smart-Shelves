from fastapi import FastAPI

from .config import get_settings
from .routes import router

settings = get_settings()

app = FastAPI(
    title='SmartShelves Bulk PDF Service',
    version='0.1.0',
    description='API for importing PDF manifests and triggering physical shelves.',
)
app.include_router(router)


@app.get('/health', tags=['health'])
async def healthcheck():
    settings.ensure_directories()
    return {'status': 'ok'}
