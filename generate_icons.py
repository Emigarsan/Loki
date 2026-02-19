#!/usr/bin/env python3
"""
Generate web app icons from LokiLogo.png
Creates 192x192, 512x512 for PWA and 48x48 favicon
"""

from PIL import Image
import os

# Paths
input_logo = "F:/Usuario/Emilio Garrote/Documentos/LMDT/Loki/LokiLogo.png"
output_dir = "F:/Usuario/Emilio Garrote/Documentos/LMDT/Loki/LokiAPP/frontend/public"

# Icon sizes
sizes = [
    (192, "icon-192.png"),
    (512, "icon-512.png"),
    (48, "favicon.png")
]

# Load original logo
logo = Image.open(input_logo)
print(f"Original logo size: {logo.size}")

# Generate each size
for size, filename in sizes:
    output_path = os.path.join(output_dir, filename)
    
    # Resize with high-quality Lanczos resampling
    resized = logo.resize((size, size), Image.Resampling.LANCZOS)
    
    # Save as optimized PNG
    resized.save(output_path, "PNG", optimize=True)
    
    file_size = os.path.getsize(output_path)
    print(f"✓ Created {filename}: {size}x{size} ({file_size / 1024:.1f} KB)")

print("\nDone! Icons generated in frontend/public/")
