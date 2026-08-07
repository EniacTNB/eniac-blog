import fs from "fs";
import path from "path";
import matter from "gray-matter";


const postsDirectory =
path.join(
    process.cwd(),
    "src/content/posts"
);


export function getPosts(){

    if(!fs.existsSync(postsDirectory)){
        return [];
    }


    const folders =
    fs.readdirSync(postsDirectory);


    const posts = folders.map(folder=>{

        const filePath =
        path.join(
            postsDirectory,
            folder,
            "index.md"
        );


        if(!fs.existsSync(filePath)){
            return null;
        }


        const file =
        fs.readFileSync(
            filePath,
            "utf-8"
        );


        const {data,content} =
        matter(file);


        return {

            slug: folder,

            ...data,

            content

        };

    });


    return posts
        .filter(Boolean)
        .filter(
            post=>post.publish===true
        )
        .sort(
            (a,b)=>
            new Date(b.date).getTime()
            -
            new Date(a.date).getTime()
        );

}
