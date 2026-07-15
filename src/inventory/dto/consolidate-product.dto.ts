import { IsInt, IsPositive } from 'class-validator';

export class ConsolidateProductDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @IsPositive()
  targetShelfId: number;
}
