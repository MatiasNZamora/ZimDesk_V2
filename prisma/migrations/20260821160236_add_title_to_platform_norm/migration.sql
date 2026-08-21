-- AlterTable
-- Las normas existentes (fila única del modelo anterior) pasan a ser el primer item,
-- titulado "General", para no perder el contenido ya cargado.
ALTER TABLE "PlatformNorm" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "PlatformNorm" ALTER COLUMN "title" DROP DEFAULT;
