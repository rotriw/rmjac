import { submitProblem } from "../vjudge/codeforces/service/submission.ts";

const code = `
// Problem: A. Submission is All You Nee
// Contest: Codeforces - Codeforces Round 1040 (Div. 2)
// URL: https://codeforces.com/contest/2130/problem/A
#include <bits/stdc++.h>
#define ff(i,l,r) for(int i=l;i<=r;i++)
#define fn(i,n) for(int i=1;i<=n;i++)
#define vadd(a,b) move(b.begin(), b.end(), back_inserter(a))
#define re(x) cin>>x;

using namespace std;
 
typedef long long ll;
typedef pair<int, int> pii;
typedef pair<ll, ll> pll;
 
const int N = 3e5 + 5, M = 2e5 + 5, MOD = 1e9 + 7;
 
int n, m;
 
void ye(bool flag){if(flag)cout<<"YES"<<'\\n';else cout<<"NO"<<'\\n';}
 
vector<int> sc(int n) {vector<int> s(n);iota(s.begin(), s.end(), 1);return s;}
 
 
ll a[N], b[N];
 
void solve() {
	
}
 
int main() {
	ios::sync_with_stdio(false);
	cin.tie(0);
	int T; cin >> T; while ( T -- ) {
		cin >> n; // Code Once, Think twice.
		ll res = 0;
		for (int i = 1; i <= n; i ++ ) {
			cin >> a[i];
			if (a[i] == 0) {
				res ++;
			}
			res += a[i];
		}
		cout << res << '\\n';
	}
	return 0;
}
`;

async function main() {
    const handle = Deno.args[0];
    const token = Deno.args[1];
    const contest_id = Deno.args[2];
    const problem_id = Deno.args[3];
    const language = Deno.args[4];
    console.log(handle, token, contest_id, problem_id, code, "89");
    const submission = await submitProblem(handle, token, contest_id, problem_id, code, language);
    console.log(submission);
}

main();