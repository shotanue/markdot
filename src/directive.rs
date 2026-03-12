#[derive(Debug, Clone)]
pub struct Fragment {
    pub depth: u8,
    pub text: String,
}

#[derive(Debug)]
pub enum Directive {
    ShellScript { code: String, lang: String },
    Brewfile { code: String, args: String },
    WriteFile { content: String, path: String, permission: Option<u32> },
    Symlink { from: String, to: String },
    CopyFile { from: String, to: String },
    Import { body: String },
}
