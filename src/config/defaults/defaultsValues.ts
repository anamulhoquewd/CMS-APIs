// 🔹 Default values
const defaults: {
  page: number;
  limit: number;
  sortType: string;
  sortBy: string;
} = {
  page: 1,
  limit: 10,
  sortType: "desc",
  sortBy: "updatedAt",
};

export default Object.freeze(defaults);
