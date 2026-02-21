import { IPackageDoc, PackageModel } from "../models/Package.js";

export class PackageRepository {
  async findByCode(code: string): Promise<IPackageDoc | null> {
    const doc = await PackageModel.findOne({ code });
    return doc ?? null;
  }

  async listActive(): Promise<IPackageDoc[]> {
    const docs = await PackageModel.find({ active: true }).sort({ sortOrder: 1 });
    return docs ?? [];
  }
}
