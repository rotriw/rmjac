import * as fs from "fs";
import * as path from "path";
import {compare, compareVersions} from "compare-versions";
import * as log4js from "log4js";
import * as _ from "lodash";


const loggerUpdated = log4js.getLogger('updated');

async function updatedVersion(from :string, to :string) {
    const pathT = path.join(global.Project.core, 'updated');
    const version = [];
    const UpdatedDir = await fs.readdirSync(pathT);
    for (const pack in UpdatedDir) {
        version.push(_.trim(UpdatedDir[pack].toString(), '.ts'));
    }
    const sorted = version.sort(compareVersions);
    for (let i = 0; i < sorted.length; i ++ ) {
        if (compare(from, sorted[i], '<') && compare(to, sorted[i], '<=')) {
            loggerUpdated.info(`Updated Log: v${i === 0 ? from : sorted[i - 1]} => v${sorted[i]}`);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            await require(path.join(process.cwd(), global.Project.core, 'updated', `${sorted[i]}.ts`)).apply();
        }
    }
}

export async function run() {
    loggerUpdated.level = global.Project.loglevel;
    if (fs.existsSync(path.join(global.Project.core, 'version.local'))) {
        const nowVersion = fs.readFileSync(path.join(global.Project.core, 'version.local')).toString();
        if (~compareVersions(nowVersion, global.Project.CoreJSON.version)) {
            loggerUpdated.info('The latest version, No updated required.');
        } else {
            loggerUpdated.info(`Need Updated. Version:  v${nowVersion} => v${global.Project.CoreJSON.version}`);
            try {
                await updatedVersion(nowVersion, global.Project.CoreJSON.version);
            } catch (err) {
                loggerUpdated.error(`Updated:error`);
                loggerUpdated.error(err);
            }
            loggerUpdated.info(`Updated done.`);
        }
        fs.writeFileSync(path.join(global.Project.core, 'version.local'), global.Project.CoreJSON.version)
    } else {
        fs.writeFileSync(path.join(global.Project.core, 'version.local'), global.Project.CoreJSON.version)
    }
}

