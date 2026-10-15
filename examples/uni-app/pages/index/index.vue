<template>
  <view class="page">
    <view class="card">
      <text class="title">frontend-monitor uni-app 示例</text>
      <text class="desc">点击按钮触发错误或埋点，数据会自动上报到监控服务。</text>
    </view>

    <view class="row">
      <button type="warn" @tap="triggerError">触发 JS 错误</button>
      <button @tap="triggerTrack">上报 pay_click</button>
      <button class="secondary" @tap="triggerDuration">上报时长埋点</button>
    </view>
  </view>
</template>

<script>
import { track } from '@frontend-monitor/uni-app';

export default {
  methods: {
    triggerError() {
      // uni-app App 的 onError 会捕获未处理异常
      const obj = undefined;
      obj.length.toString();
    },
    triggerTrack() {
      track({
        actionType: 'EVENT',
        trackId: 'pay_click',
        custom: { amount: 59.9, source: 'uni-app' },
      });
      uni.showToast({ title: '已上报 pay_click' });
    },
    triggerDuration() {
      const start = Date.now();
      setTimeout(() => {
        track({
          actionType: 'DURATION',
          trackId: 'checkout_duration',
          value: Date.now() - start,
        });
        uni.showToast({ title: '已上报时长' });
      }, 1000);
    },
  },
};
</script>

<style scoped>
.page {
  padding: 24px;
}
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}
.title {
  display: block;
  font-size: 18px;
  font-weight: 600;
}
.desc {
  display: block;
  margin-top: 8px;
  color: #66738b;
  font-size: 13px;
}
.row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.secondary {
  background: #ffffff;
  color: #1b2436;
}
</style>
