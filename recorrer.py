import os

CARPETAS_EXCLUIDAS = {"node_modules", ".git", "__pycache__"}

def debe_excluirse(nombre, ruta_completa):
    return (
        nombre in CARPETAS_EXCLUIDAS
        or nombre.startswith(".")
        or os.path.basename(ruta_completa).startswith(".")
    )

def recorrer_directorio(ruta, prefijo="", archivo_salida=None):
    try:
        elementos = sorted(os.listdir(ruta))
    except PermissionError:
        return

    elementos_filtrados = [
        e for e in elementos
        if not debe_excluirse(e, os.path.join(ruta, e))
    ]

    for i, elemento in enumerate(elementos_filtrados):
        ruta_completa = os.path.join(ruta, elemento)
        es_ultimo = (i == len(elementos_filtrados) - 1)

        simbolo = "└── " if es_ultimo else "├── "
        linea = f"{prefijo}{simbolo}{elemento}"
        print(linea)

        if archivo_salida:
            archivo_salida.write(linea + "\n")

        if os.path.isdir(ruta_completa):
            nuevo_prefijo = prefijo + ("    " if es_ultimo else "│   ")
            recorrer_directorio(ruta_completa, nuevo_prefijo, archivo_salida)

if __name__ == "__main__":
    ruta_objetivo = input("📁 Ruta a analizar (ej: ./proyecto): ").strip()
    if not os.path.exists(ruta_objetivo):
        print("❌ La ruta no existe.")
        exit(1)

    archivo_resultado = "estructura.txt"
    with open(archivo_resultado, "w", encoding="utf-8") as salida:
        salida.write(f"Estructura de: {ruta_objetivo}\n\n")
        recorrer_directorio(ruta_objetivo, archivo_salida=salida)

    print(f"\n✅ Estructura guardada en: {archivo_resultado}")
