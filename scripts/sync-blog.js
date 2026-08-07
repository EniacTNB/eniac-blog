import fs from "fs";
import path from "path";


const localPath =
path.join(
process.env.HOME,
"Documents/艾AA/2-Area/博客写作/Posts"
);


const githubPath =
"./obsidian/2-Area/博客写作/Posts";


const source =
process.env.OBSIDIAN_PATH ||
(
    fs.existsSync(localPath)
    ? localPath
    : githubPath
);


const target =
"./src/content/posts";


console.log(
"Sync source:",
source
);


if(fs.existsSync(target)){
    fs.rmSync(target,{
        recursive:true,
        force:true
    });
}


fs.mkdirSync(target,{
    recursive:true
});


fs.cpSync(
source,
target,
{
    recursive:true
}
);


console.log(
"Blog synced successfully"
);
