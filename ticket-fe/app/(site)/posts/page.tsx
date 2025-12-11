"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePosts } from "@/queries/use-posts";
import { map } from "lodash";
import React from "react";

type Post = {
  id: number | string;
  title: string;
  body: string;
};

const PostExamplePage: React.FC = () => {
  const { data: posts, isLoading } = usePosts();

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      <h2 className="py-4 text-4xl font-semibold text-gray-700">
        Post Example Page
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 ">
        {map(posts, (post: Post) => (
          <Card
            key={post.id}
            className="p-3 border rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            <CardHeader className="font-semibold">{post.title} </CardHeader>
            <CardContent>{post.body}</CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default PostExamplePage;
