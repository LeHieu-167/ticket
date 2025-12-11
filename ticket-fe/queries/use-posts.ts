import { getPosts } from "@/apis/test.service";
import { useQuery } from "react-query";

export const usePosts = () => {
  return useQuery("posts", getPosts);
};
