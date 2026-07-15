CÓMO PONER TUS GALLETAS REALES
================================

1) Galleta entera (la que cae):
   - Guarda la imagen del dinosaurio sano como:  cookie.png
     (PNG con fondo transparente preferiblemente)

2) Trozos (los 6 grandes + 5 pequeños de la foto rota):
   - CORTA cada trozo en su PROPIA imagen, pero cada PNG debe tener
     el MISMO tamaño que la imagen rota original, con el trozo en su
     sitio real y el resto TRANSPARENTE.
     -> Así el código saca solo la posición (ancla) de cada pieza y la
        explosión sale coherente (la pata no sale por la cabeza).
   - Guárdalos en:  pieces/01.png ... pieces/11.png
   - Ya existe manifest.json apuntando a esos 11 nombres. Si usas otros
     nombres, edítalo.

3) (Opcional) Sonido de crujido:
   - assets/crunch.mp3  -> suena al reventar la galleta.

RECETA RÁPIDA EN PHOTOPEA (photopea.com, gratis):
   - Abre la foto rota.
   - Varita mágica sobre el fondo negro -> Ctrl+Shift+I (invierte) aisla un trozo.
   - Ctrl+C -> Archivo > Nuevo (pon el tamaño EXACTO de la foto rota) ->
     Ctrl+V y deja el trozo donde estaba -> Exportar como PNG.
   - Repite para los 11 trozos.

LISTO: al existir cookie.png + manifest.json, el motor deja los placeholders
y usa tus imágenes automáticamente. No hace falta tocar cookie-rain.js.
