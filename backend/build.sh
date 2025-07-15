#!/bin/bash
set -e

echo "Starting build process..."

# Upgrade pip
python -m pip install --upgrade pip

# Install wheel and setuptools first
python -m pip install wheel setuptools

# Install dependencies
python -m pip install -r requirements.txt

echo "Build completed successfully!"