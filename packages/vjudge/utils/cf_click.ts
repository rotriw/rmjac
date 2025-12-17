import cv from "npm:@techstark/opencv-js";
import { Jimp } from "npm:jimp";
import { Buffer } from "node:buffer";

/**
 * 辅助函数：将 Jimp 图片转换为 OpenCV Mat
 */
async function loadMat(source: string | Uint8Array): Promise<any> {
    let input = source;
    // 强制将 Uint8Array 转为 Node Buffer，否则 Jimp v1 会将其误判为 URL/路径
    if (typeof source !== 'string' && !(source instanceof Buffer)) {
        input = Buffer.from(source);
    }

    // 读取图片
    const image = await Jimp.read(input as any);
    
    // 创建 Mat (CV_8UC4 = RGBA 4通道)
    const mat = new cv.Mat(image.bitmap.height, image.bitmap.width, cv.CV_8UC4);
    mat.data.set(image.bitmap.data);
    
    return mat;
}

/**
 * 辅助函数：将 OpenCV Mat 保存为图片文件
 */
async function saveMat(mat: any, path: string): Promise<void> {
    // ✅ 修复点：Jimp v1 构造函数必须传对象，不能传 (width, height)
    // 我们直接把 Mat 的数据传进去，一步到位
    const image = new Jimp({
        width: mat.cols,
        height: mat.rows,
        data: Buffer.from(mat.data) // 将 Uint8Array 转为 Buffer
    });

    // 保存文件
    await image.write(path as any);
}

export async function get_loc(image: Uint8Array): Promise<{x: number, y: number}> {
    console.log("get_loc");
    
    // 确保 OpenCV 初始化完成 (WASM版必须步骤)
    if ((cv as any).onRuntimeInitialized) {
        await new Promise<void>(resolve => {
            (cv as any).onRuntimeInitialized = () => resolve();
        });
    }

    let src: any = null;
    let templ: any = null;
    let dst: any = null;
    let mask: any = null;

    try {
        // 1. 读取原图
        // 注意：assets/test1.png 必须存在于你运行命令的目录下
        src = await loadMat(image);

        // 2. 读取模板 (优先内存 buffer，失败读文件)
        try {
            templ = await loadMat('assets/image.png');
        } catch (e) {
            console.warn("Buffer decode failed, reading from file:", e);
            templ = await loadMat('assets/image.png');
        }

        if (src.empty()) throw new Error("Source empty");
        if (templ.empty()) throw new Error("Template empty");

        // 3. 模板匹配
        dst = new cv.Mat();
        mask = new cv.Mat();
        // TM_CCOEFF_NORMED: 1 是完美匹配，0 是无关联，-1 是反相
        cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF_NORMED, mask);

        // 4. 获取结果
        const result = cv.minMaxLoc(dst, mask);
        const { maxLoc, maxVal } = result;

        console.log(`Matched with value ${maxVal} at ${maxLoc.x}, ${maxLoc.y}`);

        // ⚠️ 注意：匹配度过低检查
        // 你的日志显示 value 0.26，这通常意味着匹配失败（只是找到了“最不像杂音”的地方）
        // 如果图片正确，通常 value 会大于 0.8
        if (maxVal < 0.5) {
            console.warn("⚠️ Warning: Match value is very low, result might be incorrect.");
        }

        // 5. 绘制矩形验证
        const color = new cv.Scalar(0, 255, 0, 255); // Green
        const point1 = new cv.Point(maxLoc.x, maxLoc.y);
        const point2 = new cv.Point(maxLoc.x + templ.cols, maxLoc.y + templ.rows);
        cv.rectangle(src, point1, point2, color, 2, cv.LINE_8, 0);

        // 6. 保存结果图
        await saveMat(src, 'assets/match_result.png');

        return { x: maxLoc.x, y: maxLoc.y };

    } catch (err) {
        console.error("OpenCV Error:", err);
        throw err;
    } finally {
        // 7. 内存回收 (WASM 必须手动释放)
        if (src) src.delete();
        if (templ) templ.delete();
        if (dst) dst.delete();
        if (mask) mask.delete();
    }
}