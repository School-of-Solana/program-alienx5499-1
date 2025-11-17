import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, filePath, message } = await request.json();

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
    const GITHUB_PATH = process.env.GITHUB_PATH || "metadata";

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return NextResponse.json(
        { error: "GitHub configuration not set" },
        { status: 500 }
      );
    }

    const contentBase64 = Buffer.from(content, "utf8").toString("base64");
    const fullPath = `${GITHUB_PATH}/${filePath}`;

    // Check if file exists
    const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`;
    let existingSha: string | null = null;

    try {
      const checkResponse = await fetch(checkUrl, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        existingSha = existingFile.sha;
      }
    } catch (e) {
      // File doesn't exist yet
    }

    const uploadUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}`;
    const uploadBody: any = {
      message,
      content: contentBase64,
      branch: GITHUB_BRANCH,
    };

    if (existingSha) {
      uploadBody.sha = existingSha;
    }

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(uploadBody),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to upload: ${response.status} ${error}` },
        { status: response.status }
      );
    }

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${fullPath}`;
    return NextResponse.json({ url: rawUrl });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

