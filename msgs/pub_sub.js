import { FutureResolver } from './future_resolver.js';
import { getNestedField } from '../util.js';
import { DATA_CHANNEL_TYPE } from '../constants.js';
import pkg from 'async';
const { createChannelFuture } = pkg;

const logging = console;

class WebRTCDataChannelPubSub {
  constructor(channel) {
    this.channel = channel;
    this.futureResolver = new FutureResolver();
    this.subscriptions = {}; // Dictionary to hold callbacks keyed by topic
  }

  runResolve(message) {
    this.futureResolver.runResolveForTopic(message);

    // Extract the topic from the message
    const topic = message.topic;
    if (topic in this.subscriptions) {
      // Call the registered callback with the message
      const callback = this.subscriptions[topic];
      callback(message);
    }
  }

  async publish(topic, data = null, msgType = null) {
    const channel = this.channel;
    const future = createChannelFuture();

    if (channel.readyState === 'open') {
      const messageDict = {
        type: msgType || DATA_CHANNEL_TYPE.MSG,
        topic: topic,
      };
      // Only include "data" if it's not null
      if (data !== null) {
        messageDict.data = data;
      }

      // Convert the dictionary to a JSON string
      const message = JSON.stringify(messageDict);

      channel.send(message);

      // Log the message being published
      logging.info(`> message sent: ${message}`);

      // Store the future so it can be completed when the response is received
      const uuid =
        getNestedField(data, 'uuid') ||
        getNestedField(data, 'header', 'identity', 'id') ||
        getNestedField(data, 'req_uuid');

      this.futureResolver.saveResolve(
        msgType || DATA_CHANNEL_TYPE.MSG,
        topic,
        future,
        uuid
      );
    } else {
      future.setException(new Error('Data channel is not open'));
    }

    return await future;
  }

  publishWithoutCallback(topic, data = null, msgType = null) {
    if (this.channel.readyState === 'open') {
      const messageDict = {
        type: msgType || DATA_CHANNEL_TYPE.MSG,
        topic: topic,
      };

      // Only include "data" if it's not null
      if (data !== null) {
        messageDict.data = data;
      }

      // Convert the dictionary to a JSON string
      const message = JSON.stringify(messageDict);

      this.channel.send(message);

      // Log the message being published
      logging.info(`> message sent: ${message}`);
    } else {
      throw new Error('Data channel is not open');
    }
  }

  async publishRequestNew(topic, options = null) {
    // Generate a unique identifier
    const generatedId = Math.floor(Date.now() * 1000) % 2147483648 + Math.floor(Math.random() * 1000);

    // Check if api_id is provided
    if (!options || !options.api_id) {
      console.log('Error: Please provide app id');
      return createChannelFuture().setException(new Error('Please provide app id'));
    }

    // Build the request header and parameter
    const requestPayload = {
      header: {
        identity: {
          id: options.id || generatedId,
          api_id: options.api_id || 0,
        },
      },
      parameter: '',
    };

    // Add data to parameter
    if (options && options.parameter) {
      requestPayload.parameter = typeof options.parameter === 'string'
        ? options.parameter
        : JSON.stringify(options.parameter);
    }

    // Add priority if specified
    if (options && options.priority) {
      requestPayload.header.policy = {
        priority: 1,
      };
    }

    // Publish the request
    return await this.publish(topic, requestPayload, DATA_CHANNEL_TYPE.REQUEST);
  }

  subscribe(topic, callback = null) {
    const channel = this.channel;

    if (!channel || channel.readyState !== 'open') {
      console.log('Error: Data channel is not open');
      return;
    }

    // Register the callback for the topic
    if (callback) {
      this.subscriptions[topic] = callback;
    }

    this.publishWithoutCallback(topic, null, DATA_CHANNEL_TYPE.SUBSCRIBE);
  }

  unsubscribe(topic) {
    const channel = this.channel;

    if (!channel || channel.readyState !== 'open') {
      console.log('Error: Data channel is not open');
      return;
    }

    this.publishWithoutCallback(topic, null, DATA_CHANNEL_TYPE.UNSUBSCRIBE);
  }
}

export { WebRTCDataChannelPubSub };
