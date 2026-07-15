import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  categoryIds?: number[];
}
