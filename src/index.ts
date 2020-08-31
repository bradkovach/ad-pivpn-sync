#!/usr/bin/env node
import ActiveDirectory from 'activedirectory2';
import fs from 'fs';
import chalk from 'chalk';
import path from 'path';
import yargs from 'yargs';
import { exec, execSync } from 'child_process';

import { ADUser } from './ADUser';
import { banner } from './banner';
import { escapeRegExp } from './escapeRegExp';

const config = yargs
  .usage('Usage: node $0 ')
  .version('1.0.0')
  .options({
    controller: {
      type: 'string',
      alias: 'c',
      description:
        "URL for Active Directory server. Example: 'ldap://ad.contoso.local'.",
      demandOption: true,
    },
    dn: {
      type: 'string',
      description:
        "Base Distinguished Name (DN) for server. Example: 'DC=contoso,DC=local.",
      demandOption: true,
    },
    username: {
      type: 'string',
      alias: 'u',
      description: 'Active Directory user for reading directory',
      demandOption: true,
    },
    password: {
      type: 'string',
      alias: 'p',
      description: "Password for user specified by 'username'.",
      demandOption: true,
    },
    group: {
      type: 'string',
      alias: 'g',
      description: 'Active Directory group to sync with PiVPN',
      demandOption: true,
    },
    ovpnDirectory: {
      type: 'string',
      alias: 'ovpns',
      description: 'Directory containing active *.ovpn files.',
      demandOption: true,
    },
  })
  .coerce(['ovpnDirectory'], path.resolve).argv;

var ad = new ActiveDirectory({
  url: config.controller,
  baseDN: config.dn,
  username: config.username,
  password: config.password,
});

console.log(banner('Active Directory-PiVPN Sync Tool', '-', '-'));
console.table({
  'Domain Controller': config.controller,
  'AD Service Account': config.username,
  'Current User': execSync('whoami').toString().trim(),
  'Job Time': new Date().toUTCString(),
});

ad.getUsersForGroup(config.group, function (err, users) {
  users = users as ADUser[];
  if (err) {
    console.error('Active Directory search error: ', JSON.stringify(err));
  }

  if (!users) {
    console.warn(`Group ${config.groupName} not found`);
  } else {
    processUsers(users as ADUser[]);
  }
});

const check = '✔', cross = '✖';

function processUsers(users: ADUser[]) {
  console.log(chalk.whiteBright(banner(`Provisioning VPN profiles`)));

  for (const user of users) {
    const email = user.userPrincipalName,
      primaryOvpn = `${config.ovpnDirectory}/${email}.ovpn`;
    if (fs.existsSync(primaryOvpn)) {
      console.log(`${chalk.green(check)} ${chalk.dim(email)}`);
    } else {
      console.log(`${chalk.yellow('+')} ${chalk.whiteBright(email)}`);
      provision(email);
    }
  }

  console.log(banner(`Verifying existing VPN Profiles.`));

  const allProfiles: string[] = fs
    .readdirSync(config.ovpnDirectory as string)
    .sort();
  const allowedProfiles: string[] = [];

  let emailsAsRegex = users
    .map((user) => user.userPrincipalName)
    .map(escapeRegExp)
    .join('|');
  const userOvpnRegex = new RegExp(
    `^(${emailsAsRegex})(?:\-\-([A-Za-z]+))?\\.ovpn$`,
    ''
  );
  for (const profile of allProfiles) {
    const matches = profile.match(userOvpnRegex);
    const email = matches ? matches[1] : '';
    //console.log({matches});
    if (matches) {
      console.log(
        [
          chalk.green(check),
          ' ',
          chalk.white(email),
          matches[2] ? chalk.grey('--') + chalk.cyanBright(matches[2]) : '',
          chalk.grey('.ovpn'),
        ].join('')
      );
      allowedProfiles.push(profile);
    }
  }

  console.log(banner('Revoking disowned/orphaned profiles'));
  const revokedProfiles = allProfiles.filter(
    (ovpn) => allowedProfiles.indexOf(ovpn) === -1
  );
  revokedProfiles.map((ovpn) => ovpn.replace('.ovpn', '')).forEach(revoke);
  console.log(
    `Revoked ${revokedProfiles.length.toLocaleString()} VPN profiles.`,
    ' ',
    ' '
  );
}

const revoke = (profileName: string) => {
	console.log(`  ${chalk.yellow('...')} Revoking ${profileName}`);
  exec(`/usr/local/bin/pivpn revoke "${profileName}"`, (err, out, stderr) => {
    const successString = 'Certificate revoked, and CRL file updated.';
    if (out.indexOf(successString) > 0) {
      console.log(
        `  ${chalk.green(check)} Successfully revoked ${profileName}. Restart OpenVPN to kick user.`
      );
    } else {
      const filename = `revocation-fail--${profileName}--${Date.now()}.log`;
      fs.writeFile(filename, out, () => {
        console.log(
          `  ${chalk.red(cross)} Unable to revoke VPN profile. Log written to ${filename}.`
        );
      });
    }
  });
};

function provision(email: string) {
  const px = ora({
    indent: 2,
    text: 'Provisioning VPN profile',
  }).start();
  const cmd = `/usr/local/bin/pivpn add --name "${email}" nopass --days 1080`,
    successString = `Done! ${email}.ovpn successfully created!`;
  exec(cmd, (error, stdout, stderr) => {
    if (stdout.indexOf(successString) > 0) {
      px.succeed('VPN profile provisioned.');
    } else {
      px.fail('Error provisioning VPN profile.');
    }
  });
}

function write(str: string) {
	process.stdout.write(str);
}