-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelves" (
    "id" SERIAL NOT NULL,
    "location_code" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_items" (
    "id" SERIAL NOT NULL,
    "shelf_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelf_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "shelves_location_code_key" ON "shelves"("location_code");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_items_shelf_id_product_id_key" ON "shelf_items"("shelf_id", "product_id");

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "shelves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
