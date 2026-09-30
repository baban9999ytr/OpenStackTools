"""
Package Name
~~~~~~~~~~~~

A brief description of your package package.
"""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("your-package-name")
except PackageNotFoundError:
    # Package is not installed (e.g. running directly from source)
    __version__ = "0.1.0.dev0"

# Import public functions, classes, or modules here
from .core import main_function

__all__ = [
    "__version__",
    "main_function",
]
