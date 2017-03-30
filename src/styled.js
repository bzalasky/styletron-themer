import {PropTypes, Component} from 'react';
import _ from 'lodash';
import {injectStylePrefixed} from 'styletron-utils';

let unnamedCounter = 0;

class Styled extends Component {

  // we pull context from above
  static contextTypes = {

    // from StyletronProvider (see styletron-react)
    styletron:        PropTypes.object.isRequired,

    // from ThemeProvider
    themeProvider:    PropTypes.shape({
      theme:            PropTypes.object.isRequired,
      installComponent: PropTypes.func.isRequired,
      applyMiddleware:  PropTypes.func.isRequired
    })
  };

  /*
   every styled component can take two props which allow you to override
   the styles generated by the component directly:

   * className => if the user of a component passes a className prop explicitly,
   it is prepended to the list of styletron classes. use this to link to
   hard-coded classes in an external CSS file (e.g., "margined" or "select-multi")

   * style => the user can pass in a styletron object to override specific styles.
   this overloads React's "style" prop. it integrates with the styletron system,
   so the result of passing a style prop will actually be additional classes,
   not an inline style attribute
   */
  static propTypes = {
    name:         PropTypes.string,   // unnamed components are not themeable; useful for one-offs
    staticStyle:  PropTypes.object,
    dynamicStyle: PropTypes.func,
    className:    PropTypes.string,
    style:        PropTypes.object,
    children:     PropTypes.func.isRequired
  }

  constructor(props, context) {
    super(props, context);
    if (!context.themeProvider) {
      // TODO: throw or console.error
    }

    this.componentName = props.name;

    // ensure that the component's default styles are inserted into the master theme.
    // unnamed components are not installed into the theme
    //
    if (this.componentName)
      context.themeProvider.installComponent(props.name, props.staticStyle);
    else
      this.componentName = `Unnamd_${unnamedCounter++}`;   // guaranteed to not be a legit component name in the theme
  }

  // this is where the magic happens. here we figure out what styles need to be applied
  // to this instance of the component. returns an object of styletron attributes (not classes)
  //
  getStyle() {
    let // the theme is stored on context. this is our default theme, plus the user's overrides
      masterTheme = this.context.themeProvider.theme,

      // the theme for this component only. the fallback was used when we didn't require
      // a ThemeProvider as an ancestor, and should not be needed any more
      componentTheme = masterTheme[this.componentName] || this.props.staticStyle,

      // if the user doesn't give us a dynamic styling function, use the default styles
      styleObj = componentTheme;

    // use the component's dynamic styling function to adjust the styles for this instance
    // based on props
    //
    if (typeof this.props.dynamicStyle === 'function') {
      styleObj = this.props.dynamicStyle({

        // the base theme for this component
        componentTheme,

        // the global meta (for colors and other global attributes)
        globalMeta: masterTheme.meta,

        // last, but not least, the props
        props: this.props
      });
    }

    // all components accept a "style" prop for custom styletron attributes.
    // this overrides React's use of "style", as described above.
    //
    styleObj = _.merge({}, styleObj, this.props.style);

    // lastly, middleware
    return this.context.themeProvider.applyMiddleware(styleObj);
  }

  render() {
    const styleProperties = this.getStyle(),
          {className, children, ...otherProps} = this.props,
          {name, staticStyle, dynamicStyle, style, ...passThroughProps} = otherProps,  // eslint-disable-line
          {styletron, themeProvider: {theme}} = this.context,

          // convert the style properties into a set of classes. this is where
          // we let styletron do its magic
          styletronClasses = injectStylePrefixed(styletron, styleProperties);

    // invoke the render callback with two params
    return children(

      // see above for comments on the use of the className prop for legacy CSS classes
      (className ? className + ' ' : '') + styletronClasses,

      {
        // the base theme of your component
        componentTheme: theme[this.componentName],

        // the global meta (for colors, etc)
        globalMeta:     theme.meta,

        // TODO: this may be unnecessary. needs consideration.
        passThrough:    passThroughProps
      }
      );
  }
}

export default Styled;
