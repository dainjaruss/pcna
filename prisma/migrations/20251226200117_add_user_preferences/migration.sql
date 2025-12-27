-- AlterTable
ALTER TABLE "UserSetting" ADD COLUMN     "preferredCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferredCelebrities" TEXT[] DEFAULT ARRAY[]::TEXT[];
