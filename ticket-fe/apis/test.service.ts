import api from "@/config/axios.config";

export const getPosts = async () => {
  try {
    const posts = await api.get(`/posts`);
    return posts.data;
  } catch (error) {
    console.log(error?.message);
  }
};
