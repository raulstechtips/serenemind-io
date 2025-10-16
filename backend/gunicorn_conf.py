import logging

# Disable Gunicorn access log entirely
accesslog = None

class DropAll(logging.Filter):
	def filter(self, record: logging.LogRecord) -> bool:
		return False

def on_starting(server):
	logging.getLogger("uvicorn.access").addFilter(DropAll())
