"""Main entry point for the application."""

import argparse
import logging
import sys


def setup_logging(verbose: bool = False) -> None:
    """Configure basic logging settings."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="A brief description of what this program does."
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="enable debug logging output",
    )
    return parser.parse_args()


def main() -> int:
    """Execute main application logic.

    Returns:
        int: Exit code (0 for success, non-zero for errors).
    """
    args = parse_args()
    setup_logging(args.verbose)

    logging.info("Starting application...")

    try:
        # Your core application logic goes here
        print("Hello, world!")
        logging.info("Application completed successfully.")
        return 0

    except Exception as err:
        logging.error("An unexpected error occurred: %s", err, exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
