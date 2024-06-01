import { Hono } from "hono";
import { renderer } from "./renderer";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.use(renderer);

app.get("/", (c) => {
  return c.render(<h1>Hello!</h1>);
});

const createPostSchema = z.object({
  title: z.string().min(1, "最小1文字必要です").max(100, "最大100文字までです"),
  body: z.string().min(1, "最小1文字必要です").max(100, "最大100文字までです"),
});

app.post("/posts", zValidator("form", createPostSchema), async (c) => {
  const { title, body } = c.req.valid("form");
  const sql = "INSERT INTO posts (title, body) VALUES (?, ?)";
  await c.env.DB.prepare(sql).bind(title, body).run();
  return c.redirect("/posts");
});

const PostForm = () => (
  <form method="post" action="/posts">
    <input name="title" placeholder="title" />
    <input name="body" placeholder="body" />
    <button>Post</button>
  </form>
);

type Post = {
  id: string;
  title: string;
  body: string;
};

const PostList = ({ posts }: { posts: Post[] }) => (
  <div>
    {posts.map((post) => (
      <div>
        <a href={`/posts/${post.id}`}>
          <div>Title: {post.title}</div>
        </a>
        <div>Body: {post.body}</div>
        <hr />
      </div>
    ))}
  </div>
);

app.get("posts", async (c) => {
  const posts = await c.env.DB.prepare("SELECT * FROM posts").all<Post>();
  return c.render(
    <div>
      <PostForm />
      <PostList posts={posts.results} />
    </div>
  );
});

app.get("/posts/:id", async (c) => {
  const id = c.req.param("id");
  const post = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .all<Post>();
  return c.render(
    <form>
      <input name="title" value={post.results[0].title} />
      <input name="body" value={post.results[0].body} />
      <button>Update</button>
      <button>Delete</button>
    </form>
  );
});

app.delete("/posts/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return c.redirect("/posts");
});

export default app;
