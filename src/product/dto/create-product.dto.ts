import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo dos decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser negativo.' })
  @IsOptional()
  price?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  categoryIds?: number[];
}
