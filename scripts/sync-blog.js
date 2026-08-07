import fs from "fs";


const source =
"/Users/eniac/Documents/艾AA/2-Area/博客写作/Posts";


const target =
"./src/content/posts";


if(fs.existsSync(target)){
    fs.rmSync(target,{
        recursive:true
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
