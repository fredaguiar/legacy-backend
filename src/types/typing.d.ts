type TUser = {
  _id?: Types.ObjectId;
  firstName: string;
  lastName: string;
  language: string;
  country: Country;
  email: string;
  phoneCountry: string;
  phone: string;
  password?: string;
  token?: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  mobileVerifyCode?: number;
  introductionViewed?: boolean;
  storageQuotaInMB?: number;
  lifeCheck?: boolean;
  safes: Array<TSafe>;
};

type TCredentials = {
  email: string;
  password: string;
};

type Country = 'BR' | 'USA';

type TSafe = {
  name?: string;
  description?: string;
  autoSharing?: boolean;
  emails?: Array<TContact>;
  phones?: Array<TContact>;
  fieldToUpdate?: 'name' | 'description' | 'autoSharing';
  contactToUpdate?: 'emails' | 'phones';
  _id?: Types.ObjectId;
};

type TFileInfo = {
  id: string;
  filename: string;
  length: number;
  uploadDate: Date;
  mimetype: string;
};

type TFileInfoListResult = {
  fileInfoList: TFileInfo[];
};

type TPassword = {
  title: string;
  username: string;
  password: string;
  notes?: string;
  safeId: string;
  fileId?: string;
};

type TContact = {
  name: string;
  contact: string;
  type: string;
  _id: Types.ObjectId;
};

type TContactUpdate = {
  safeId: string;
  contactList: TContact[];
  deleteContactList: string[];
  contactType: 'emails' | 'phones';
};

type StorageInfo = {
  storageUsedInBytes: number;
  storageFileCount: number;
  storageQuotaInMB: number;
};
