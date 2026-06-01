/**
 * 创始会员初始化脚本
 * 在浏览器控制台运行此脚本创建创始会员账号
 */

function initFounder() {
    const auth = new AuthSystem();
    
    // 创建创始会员
    const founderUsername = '郝仕麟';
    const founderPassword = '956244978';
    
    if (auth.users[founderUsername]) {
        console.log('创始会员已存在:', founderUsername);
        return;
    }
    
    auth.users[founderUsername] = {
        username: founderUsername,
        password: auth.hashPassword(founderPassword),
        role: 'member',
        createdAt: new Date().toISOString(),
        favorites: []
    };
    
    auth.saveUsers();
    
    console.log('创始会员创建成功！');
    console.log('用户名:', founderUsername);
    console.log('密码:', founderPassword);
    console.log('');
    console.log('请使用以上账号登录，然后点击"邀请好友"生成邀请码。');
}

// 自动运行
initFounder();
