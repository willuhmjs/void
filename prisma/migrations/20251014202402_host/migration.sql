-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EndpointHosts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EndpointHosts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EndpointHosts_B_index" ON "_EndpointHosts"("B");

-- AddForeignKey
ALTER TABLE "_EndpointHosts" ADD CONSTRAINT "_EndpointHosts_A_fkey" FOREIGN KEY ("A") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EndpointHosts" ADD CONSTRAINT "_EndpointHosts_B_fkey" FOREIGN KEY ("B") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
