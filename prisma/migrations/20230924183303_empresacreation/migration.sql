/*
  Warnings:

  - Added the required column `identificacao` to the `Carro` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Carro" ADD COLUMN     "identificacao" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "userEmail" TEXT,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmpresaToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EmpresaToUser_AB_unique" ON "_EmpresaToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_EmpresaToUser_B_index" ON "_EmpresaToUser"("B");

-- AddForeignKey
ALTER TABLE "_EmpresaToUser" ADD CONSTRAINT "_EmpresaToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmpresaToUser" ADD CONSTRAINT "_EmpresaToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("email") ON DELETE CASCADE ON UPDATE CASCADE;
